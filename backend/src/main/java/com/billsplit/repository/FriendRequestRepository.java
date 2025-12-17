package com.billsplit.repository;

import com.billsplit.model.FriendRequest;
import com.billsplit.model.FriendRequestStatus;
import com.billsplit.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    Optional<FriendRequest> findBySenderAndReceiver(User sender, User receiver);

    // Check if any request exists regardless of direction (to prevent duplicates)
    // Note: This might be too strict if we allow re-requesting after rejection, but
    // good for now.
    boolean existsBySenderAndReceiver(User sender, User receiver);

    List<FriendRequest> findByReceiverAndStatus(User receiver, FriendRequestStatus status);

    List<FriendRequest> findBySenderAndStatus(User sender, FriendRequestStatus status);
}
