package com.smartpricing.demo.generator;

// Generator-only ground truth. Not an application pricing/analytics feature or DTO input.
public enum DemoScenario {
    ELASTIC_HIGH("Pantry", "Roasted Coffee", -2.6, 20),
    ELASTIC_LOW("Pantry", "Everyday Rice", -0.25, 14),
    SEASONAL("Home", "Summer Picnic Set", -1.1, 16),
    PROMOTION("Kitchen", "Ceramic Mug", -1.2, 12),
    STOCKOUT("Kitchen", "Glass Storage Jar", -1.4, 18),
    SPARSE("Accessories", "Travel Organizer", -0.9, 0.7),
    REFUND("Accessories", "Canvas Carry Bag", -0.8, 10),
    COST_CHANGE_UNKNOWN("Home", "Cotton Table Linen", -1.0, 12),
    ARCHIVE("Stationery", "Classic Notebook", -0.7, 10),
    ZERO_SALES("Stationery", "Desk Pen Set", -1.2, 11);

    private final String category;
    private final String name;
    private final double elasticity;
    private final double baseDemand;
    DemoScenario(String category, String name, double elasticity, double baseDemand) {
        this.category=category; this.name=name; this.elasticity=elasticity; this.baseDemand=baseDemand;
    }
    public String category() { return category; }
    public String productName() { return name; }
    public double elasticity() { return elasticity; }
    public double baseDemand() { return baseDemand; }
}
