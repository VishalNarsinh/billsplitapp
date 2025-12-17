package com.billsplit.service;

import com.billsplit.model.Group;
import com.billsplit.model.User;
import com.billsplit.repository.GroupRepository;
import com.billsplit.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GroupService {
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final com.billsplit.repository.FriendshipRepository friendshipRepository;

    public GroupService(GroupRepository groupRepository, UserRepository userRepository,
            com.billsplit.repository.FriendshipRepository friendshipRepository) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.friendshipRepository = friendshipRepository;
    }

    public User createUser(String name, String email) {
        // Legacy method, better to use register now, but keeping for compatibility
        return userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(new User(name, email, "$2a$10$NotRealHashForLegacyUsers")));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<Group> getAllGroups() {
        return groupRepository.findAll();
    }

    public List<Group> getGroupsForUser(User user) {
        return groupRepository.findByMembersContaining(user);
    }

    public Group createGroup(String name, User creator) {
        Group group = new Group(name);
        group.getMembers().add(creator);
        return groupRepository.save(group);
    }

    public Group getGroup(Long id) {
        return groupRepository.findById(id).orElseThrow(() -> new RuntimeException("Group not found"));
    }

    public Group addUserToGroup(Long groupId, Long userId, User currentUser) {
        Group group = getGroup(groupId);

        // 1. Validate currentUser is a member of the group (or admin logic if we had
        // roles)
        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(currentUser.getId()));

        if (!isMember) {
            throw new com.billsplit.exception.InvalidOperationException(
                    "You must be a member of the group to add others.");
        }

        // 2. Validate the user to be added exists
        User userToAdd = userRepository.findById(userId)
                .orElseThrow(() -> new com.billsplit.exception.ResourceNotFoundException("User", "id", userId));

        // 3. Validate userToAdd is a FRIEND of currentUser
        // We know we can't add non-friends.
        if (!friendshipRepository.existsByUsers(currentUser, userToAdd)) {
            throw new com.billsplit.exception.InvalidOperationException("You can only add your friends to the group.");
        }

        // 4. Validate userToAdd is not ALREADY in the group
        boolean alreadyInGroup = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(userId));

        if (alreadyInGroup) {
            throw new com.billsplit.exception.ResourceAlreadyExistsException("User is already in the group.");
        }

        group.getMembers().add(userToAdd);
        return groupRepository.save(group);
    }
}
