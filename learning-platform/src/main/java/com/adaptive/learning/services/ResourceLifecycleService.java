package com.adaptive.learning.services;

import com.adaptive.learning.models.IntroPage;
import com.adaptive.learning.models.LearningModule;
import com.adaptive.learning.models.Question;
import com.adaptive.learning.repositories.IntroPageRepository;
import com.adaptive.learning.repositories.LearningModuleRepository;
import com.adaptive.learning.repositories.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ResourceLifecycleService {

    private final IntroPageRepository introPageRepository;
    private final LearningModuleRepository learningModuleRepository;
    private final QuestionRepository questionRepository;

    public ResourceLifecycleService(IntroPageRepository introPageRepository,
                                    LearningModuleRepository learningModuleRepository,
                                    QuestionRepository questionRepository) {
        this.introPageRepository = introPageRepository;
        this.learningModuleRepository = learningModuleRepository;
        this.questionRepository = questionRepository;
    }

    @Transactional
    public void propagateResourceUrlUpdate(String oldUrl, String newUrl) {
        if (oldUrl == null || newUrl == null || oldUrl.equals(newUrl)) {
            return; // Nothing to update
        }

        // 1. Update all Intro Pages
        List<IntroPage> allPages = introPageRepository.findAll();
        for (IntroPage page : allPages) {
            boolean changed = false;
            if (page.getContent() != null && page.getContent().contains(oldUrl)) {
                page.setContent(page.getContent().replace(oldUrl, newUrl));
                changed = true;
            }
            if (changed) {
                introPageRepository.save(page);
            }
        }

        // 2. Update all Learning Modules
        List<LearningModule> allModules = learningModuleRepository.findAll();
        for (LearningModule module : allModules) {
            boolean changed = false;
            if (module.getHtmlContent() != null && module.getHtmlContent().contains(oldUrl)) {
                module.setHtmlContent(module.getHtmlContent().replace(oldUrl, newUrl));
                changed = true;
            }
            if (changed) {
                learningModuleRepository.save(module);
            }
        }

        // 3. Update all Questions
        List<Question> allQuestions = questionRepository.findAll();
        for (Question q : allQuestions) {
            boolean changed = false;
            if (q.getQuestionText() != null && q.getQuestionText().contains(oldUrl)) {
                q.setQuestionText(q.getQuestionText().replace(oldUrl, newUrl));
                changed = true;
            }
            if (q.getCustomFeedbackText() != null && q.getCustomFeedbackText().contains(oldUrl)) {
                q.setCustomFeedbackText(q.getCustomFeedbackText().replace(oldUrl, newUrl));
                changed = true;
            }
            if (changed) {
                questionRepository.save(q);
            }
        }
    }
}
