package com.billsplit.repository;

import com.billsplit.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<Group, Long> {
    java.util.List<Group> findByMembersContaining(com.billsplit.model.User member);
}
