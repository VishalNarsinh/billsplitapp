package com.billsplit.controller;

import com.billsplit.dto.GroupDTO;
import com.billsplit.dto.UserDTO;
import com.billsplit.mapper.DtoMapper;
import com.billsplit.model.Group;
import com.billsplit.model.User;
import com.billsplit.service.BillSplitService;
import com.billsplit.service.GroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allow frontend access
public class GroupController {
    private final GroupService groupService;
    private final BillSplitService billSplitService;
    private final DtoMapper dtoMapper;

    public GroupController(GroupService groupService, BillSplitService billSplitService, DtoMapper dtoMapper) {
        this.groupService = groupService;
        this.billSplitService = billSplitService;
        this.dtoMapper = dtoMapper;
    }

    @PostMapping("/users")
    public ResponseEntity<UserDTO> createUser(@RequestBody User user) {
        User createdUser = groupService.createUser(user.getName(), user.getEmail());
        return ResponseEntity.ok(dtoMapper.toUserDTO(createdUser));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<User> users = groupService.getAllUsers();
        return ResponseEntity.ok(users.stream()
                .map(dtoMapper::toUserDTO)
                .collect(Collectors.toList()));
    }

    @PostMapping("/groups")
    public ResponseEntity<GroupDTO> createGroup(@RequestBody Group group,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        User currentUser = groupService.getUserByEmail(userDetails.getUsername());
        Group createdGroup = groupService.createGroup(group.getName(), currentUser);
        return ResponseEntity.ok(dtoMapper.toGroupDTO(createdGroup));
    }

    @GetMapping("/groups")
    public ResponseEntity<List<GroupDTO>> getAllGroups(
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        User currentUser = groupService.getUserByEmail(userDetails.getUsername());
        List<Group> groups = groupService.getGroupsForUser(currentUser);
        return ResponseEntity.ok(groups.stream()
                .map(dtoMapper::toGroupDTO)
                .collect(Collectors.toList()));
    }

    @GetMapping("/groups/{id}")
    public ResponseEntity<GroupDTO> getGroup(@PathVariable Long id) {
        Group group = groupService.getGroup(id);
        return ResponseEntity.ok(dtoMapper.toGroupDTO(group));
    }

    @PostMapping("/groups/{groupId}/users/{userId}")
    public ResponseEntity<GroupDTO> addUserToGroup(@PathVariable Long groupId, @PathVariable Long userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        User currentUser = groupService.getUserByEmail(userDetails.getUsername());
        if (currentUser == null)
            throw new RuntimeException("User not found");

        Group group = groupService.addUserToGroup(groupId, userId, currentUser);
        return ResponseEntity.ok(dtoMapper.toGroupDTO(group));
    }

    @GetMapping("/groups/{groupId}/balances")
    public ResponseEntity<List<com.billsplit.dto.BalanceDTO>> getGroupBalances(@PathVariable Long groupId) {
        return ResponseEntity.ok(billSplitService.calculateBalances(groupId));
    }

    @GetMapping("/groups/{groupId}/debts")
    public ResponseEntity<List<com.billsplit.dto.DebtDTO>> getGroupDebts(@PathVariable Long groupId) {
        return ResponseEntity.ok(billSplitService.calculateDebts(groupId));
    }
}
