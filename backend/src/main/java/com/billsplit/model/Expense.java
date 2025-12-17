package com.billsplit.model;

import jakarta.persistence.*;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "expenses")
@Data
@NoArgsConstructor
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String description;
    private BigDecimal totalAmount;
    private LocalDateTime date;

    @ManyToOne
    @JoinColumn(name = "payer_id")
    private User payer;

    @ManyToOne
    @JoinColumn(name = "group_id")
    private Group group;

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExpenseShare> shares = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private ExpenseType type;

    public Expense(String description, BigDecimal totalAmount, User payer, Group group, ExpenseType type) {
        this.description = description;
        this.totalAmount = totalAmount;
        this.payer = payer;
        this.group = group;
        this.type = type;
        this.date = LocalDateTime.now();
    }
}
