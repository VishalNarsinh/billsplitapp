package com.billsplit.service;

import com.billsplit.model.*;
import com.billsplit.repository.FriendRequestRepository;
import com.billsplit.repository.FriendshipRepository;
import com.billsplit.repository.UserRepository;
import com.billsplit.model.FriendRequestStatus;
import com.billsplit.exception.ResourceNotFoundException;
import com.billsplit.exception.ResourceAlreadyExistsException;
import com.billsplit.exception.InvalidOperationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FriendService {

    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipRepository friendshipRepository;

    public FriendService(UserRepository userRepository,
            FriendRequestRepository friendRequestRepository,
            FriendshipRepository friendshipRepository) {
        this.userRepository = userRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.friendshipRepository = friendshipRepository;
    }

    public List<User> searchUsers(String query, User currentUser) {
        // Simple search: Find by name or email
        List<User> candidates = userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query);

        // Filter out:
        // 1. Self
        // 2. Existing Friends
        // 3. Pending Requests?? (Maybe show status instead, but for now exclude)

        return candidates.stream()
                .filter(u -> !u.getId().equals(currentUser.getId()))
                // We now include existing friends in results, enabling the frontend to show
                // them with "Already Friend" status
                // .filter(u -> !friendshipRepository.existsByUsers(currentUser, u))
                .collect(Collectors.toList());
    }

    @Transactional
    public void sendFriendRequest(User sender, Long receiverId) {
        if (sender.getId().equals(receiverId)) {
            throw new InvalidOperationException("Cannot send friend request to yourself");
        }

        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", receiverId));

        // Check if friendship already exists
        if (friendshipRepository.existsByUsers(sender, receiver)) {
            throw new ResourceAlreadyExistsException("You are already friends");
        }

        // Check for existing pending request (direction: sender -> receiver)
        if (friendRequestRepository.existsBySenderAndReceiver(sender, receiver)) {
            throw new ResourceAlreadyExistsException("Friend request already sent");
        }

        // Check for reverse pending request? (receiver -> sender)
        if (friendRequestRepository.existsBySenderAndReceiver(receiver, sender)) {
            throw new InvalidOperationException("This user has already sent you a friend request. Please accept it.");
        }

        FriendRequest request = new FriendRequest(sender, receiver);
        friendRequestRepository.save(request);
    }

    @Transactional
    public void acceptRequest(User receiver, Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request", "id", requestId));

        if (!request.getReceiver().getId().equals(receiver.getId())) {
            throw new InvalidOperationException("You can only accept requests sent to you");
        }

        if (request.getStatus() != FriendRequestStatus.PENDING) {
            throw new InvalidOperationException("Request is not pending (Status: " + request.getStatus() + ")");
        }

        // Create Friendship
        Friendship friendship = new Friendship(request.getSender(), request.getReceiver());
        friendshipRepository.save(friendship);

        // Update Request Status
        request.setStatus(FriendRequestStatus.ACCEPTED);
        friendRequestRepository.save(request);
    }

    @Transactional
    public void rejectRequest(User receiver, Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request", "id", requestId));

        if (!request.getReceiver().getId().equals(receiver.getId())) {
            throw new InvalidOperationException("You can only reject requests sent to you");
        }

        // DELETE the request so the user can send a fresh one later
        friendRequestRepository.delete(request);
    }

    public List<FriendRequest> getPendingRequests(User receiver) {
        return friendRequestRepository.findByReceiverAndStatus(receiver, FriendRequestStatus.PENDING);
    }

    public List<FriendRequest> getSentRequests(User sender) {
        return friendRequestRepository.findBySenderAndStatus(sender, FriendRequestStatus.PENDING);
    }

    public List<User> getFriends(User user) {
        List<Friendship> friendships = friendshipRepository.findAllByUser(user);
        return friendships.stream()
                .map(f -> f.getUser1().getId().equals(user.getId()) ? f.getUser2() : f.getUser1())
                .collect(Collectors.toList());
    }
}
