package com.adaptive.learning.models;

public enum NavigationMode {
    /** All sidebar items unlocked from the start — learner can jump anywhere. */
    OPEN,
    /** Items unlock progressively as the learner completes each step. Default. */
    PROGRESSIVE,
    /** Sidebar hidden or fully locked — learner can only use Next/Previous buttons. */
    READ_ONLY
}
