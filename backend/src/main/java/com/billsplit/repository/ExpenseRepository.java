package com.billsplit.repository;

import com.billsplit.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByGroupId(Long groupId);

    List<Expense> findByGroupIn(List<com.billsplit.model.Group> groups);
}
