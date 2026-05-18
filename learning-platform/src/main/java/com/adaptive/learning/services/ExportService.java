package com.adaptive.learning.services;

import com.adaptive.learning.models.*;
import com.adaptive.learning.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExportService {

    private final CourseRepository courseRepository;
    private final LearningObjectiveRepository loRepository;
    private final QuestionRepository questionRepository;
    private final IntroPageRepository introPageRepository;
    private final LearningModuleRepository moduleRepository;

    public ExportService(CourseRepository courseRepository,
                         LearningObjectiveRepository loRepository,
                         QuestionRepository questionRepository,
                         IntroPageRepository introPageRepository,
                         LearningModuleRepository moduleRepository) {
        this.courseRepository = courseRepository;
        this.loRepository = loRepository;
        this.questionRepository = questionRepository;
        this.introPageRepository = introPageRepository;
        this.moduleRepository = moduleRepository;
    }

    /** Returns a full map representation of the course for JSON export */
    public Map<String, Object> exportCourse(Long courseId) {
        Course course = courseRepository.findById(courseId).orElseThrow();
        
        Map<String, Object> data = new HashMap<>();
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("title", course.getTitle());
        metadata.put("description", course.getDescription() != null ? course.getDescription() : "");
        metadata.put("wiifm", course.getWiifm() != null ? course.getWiifm() : "");
        metadata.put("language", course.getLanguage());
        metadata.put("version", course.getVersion());
        metadata.put("roundSize", course.getRoundSize());
        metadata.put("isQuestionsRandomized", course.isQuestionsRandomized());
        metadata.put("isOptionsRandomized", course.isOptionsRandomized());
        metadata.put("passingScorePercent", course.getPassingScorePercent());
        metadata.put("maxAttempts", course.getMaxAttempts());
        metadata.put("tags", course.getTags());
        data.put("metadata", metadata);

        data.put("introPages", introPageRepository.findByCourseIdOrderByDisplayOrderAsc(courseId).stream()
            .map(p -> Map.of("title", p.getTitle(), "content", p.getContent(), "order", p.getDisplayOrder()))
            .collect(Collectors.toList()));

        var los = loRepository.findByCourseId(courseId);
        data.put("learningObjectives", los.stream().map(lo -> {
            Map<String, Object> loMap = new HashMap<>();
            loMap.put("id", lo.getId()); // Internal ref for questions mapping
            loMap.put("title", lo.getTitle());
            loMap.put("description", lo.getDescription());

            var questions = questionRepository.findByLearningObjectiveCourseId(courseId).stream()
                .filter(q -> q.getLearningObjective().getId().equals(lo.getId()))
                .map(q -> {
                    Map<String, Object> qMap = new HashMap<>();
                    qMap.put("text", q.getQuestionText());
                    qMap.put("poolType", q.getPoolType().name());
                    qMap.put("feedback", q.getCustomFeedbackText());
                    qMap.put("options", q.getOptions().stream()
                        .map(o -> Map.of("text", o.getOptionText(), "isCorrect", o.isCorrect()))
                        .collect(Collectors.toList()));
                    return qMap;
                }).collect(Collectors.toList());
            
            loMap.put("questions", questions);
            return loMap;
        }).collect(Collectors.toList()));

        data.put("modules", moduleRepository.findByCourseIdOrderByDisplayOrderAsc(courseId).stream()
            .map(m -> {
                Map<String, Object> mMap = new HashMap<>();
                mMap.put("title", m.getTitle());
                mMap.put("htmlContent", m.getHtmlContent());
                mMap.put("order", m.getDisplayOrder());
                if (m.getLearningObjective() != null) {
                    mMap.put("loRef", m.getLearningObjective().getTitle());
                }
                return mMap;
            }).collect(Collectors.toList()));

        return data;
    }

    @Transactional
    public void importCourse(Long courseId, Map<String, Object> data) {
        Course course = courseRepository.findById(courseId).orElseThrow();
        
        // Update metadata
        Map<String, Object> meta = (Map<String, Object>) data.get("metadata");
        if (meta != null) {
            course.setTitle((String) meta.get("title"));
            course.setDescription((String) meta.get("description"));
            course.setWiifm((String) meta.get("wiifm"));
            course.setLanguage((String) meta.get("language"));
            course.setRoundSize((Integer) meta.get("roundSize"));
            course.setTags((List<String>) meta.get("tags"));
            course.setUpdatedAt(LocalDateTime.now());
            courseRepository.save(course);
        }

        // --- Simplified import logic: Clear existing and replace ---
        // In production, we might want to merge or diff, but for authoring tools "restore" usually means "overwrite".
        
        // 1. Clear existing questions, LOs, pages, modules
        introPageRepository.findByCourseIdOrderByDisplayOrderAsc(courseId).forEach(introPageRepository::delete);
        moduleRepository.findByCourseIdOrderByDisplayOrderAsc(courseId).forEach(moduleRepository::delete);
        
        // Note: Questions are cascade-deleted if we handle LOs properly or delete them manually
        questionRepository.findByLearningObjectiveCourseId(courseId).forEach(questionRepository::delete);
        loRepository.findByCourseId(courseId).forEach(loRepository::delete);

        // 2. Re-import LOs and Questions
        List<Map<String, Object>> los = (List<Map<String, Object>>) data.get("learningObjectives");
        if (los != null) {
            for (Map<String, Object> loData : los) {
                LearningObjective lo = new LearningObjective();
                lo.setTitle((String) loData.get("title"));
                lo.setDescription((String) loData.get("description"));
                lo.setCourse(course);
                lo = loRepository.save(lo);

                List<Map<String, Object>> questions = (List<Map<String, Object>>) loData.get("questions");
                if (questions != null) {
                    for (Map<String, Object> qData : questions) {
                        Question q = new Question();
                        q.setQuestionText((String) qData.get("text"));
                        q.setPoolType(PoolType.valueOf((String) qData.get("poolType")));
                        q.setCustomFeedbackText((String) qData.get("feedback"));
                        q.setLearningObjective(lo);
                        
                        List<Map<String, Object>> opts = (List<Map<String, Object>>) qData.get("options");
                        if (opts != null) {
                            List<QuestionOption> options = opts.stream().map(oData -> {
                                QuestionOption o = new QuestionOption();
                                o.setOptionText((String) oData.get("text"));
                                o.setCorrect((Boolean) oData.get("isCorrect"));
                                o.setQuestion(q);
                                return o;
                            }).collect(Collectors.toList());
                            q.setOptions(options);
                        }
                        questionRepository.save(q);
                    }
                }
            }
        }

        // 3. Re-import Intro Pages
        List<Map<String, Object>> intros = (List<Map<String, Object>>) data.get("introPages");
        if (intros != null) {
            for (Map<String, Object> pData : intros) {
                IntroPage p = new IntroPage();
                p.setTitle((String) pData.get("title"));
                p.setContent((String) pData.get("content"));
                p.setDisplayOrder((Integer) pData.get("order"));
                p.setCourse(course);
                introPageRepository.save(p);
            }
        }
        
        // 4. Re-import Modules
        List<Map<String, Object>> modules = (List<Map<String, Object>>) data.get("modules");
        if (modules != null) {
            for (Map<String, Object> mData : modules) {
                LearningModule m = new LearningModule();
                m.setTitle((String) mData.get("title"));
                m.setHtmlContent((String) (mData.get("htmlContent") != null ? mData.get("htmlContent") : mData.get("content")));
                m.setDisplayOrder((Integer) mData.get("order"));
                m.setCourse(course);
                moduleRepository.save(m);
            }
        }
    }
}
