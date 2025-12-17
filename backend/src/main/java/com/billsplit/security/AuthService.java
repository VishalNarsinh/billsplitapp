package com.billsplit.security;

import com.billsplit.mapper.DtoMapper;
import com.billsplit.model.RefreshToken;
import com.billsplit.model.User;
import com.billsplit.payload.AuthPayloads;
import com.billsplit.repository.RefreshTokenRepository;
import com.billsplit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;
        private final RefreshTokenRepository refreshTokenRepository;
        private final DtoMapper dtoMapper;

        @Value("${application.security.jwt.refresh-token.expiration}")
        private long refreshExpiration;

        public AuthPayloads.AuthResponse register(AuthPayloads.RegisterRequest request) {
                var user = new User(request.getName(), request.getEmail(),
                                passwordEncoder.encode(request.getPassword()));
                user.setRole("ROLE_USER");
                user.setEnabled(true);
                var savedUser = userRepository.save(user);
                var jwtToken = jwtService
                                .generateToken(new CustomUserDetailsService(userRepository)
                                                .loadUserByUsername(user.getEmail()));
                var refreshToken = createRefreshToken(savedUser);

                return AuthPayloads.AuthResponse.builder()
                                .accessToken(jwtToken)
                                .refreshToken(refreshToken.getToken())
                                .user(dtoMapper.toUserDTO(savedUser))
                                .build();
        }

        public AuthPayloads.AuthResponse authenticate(AuthPayloads.LoginRequest request) {
                try {
                        authenticationManager.authenticate(
                                        new UsernamePasswordAuthenticationToken(request.getEmail(),
                                                        request.getPassword()));
                } catch (Exception e) {
                        System.out.println("FAILURE: Authentication failed for " + request.getEmail());
                        System.out.println("FAILURE: Exception Class: " + e.getClass().getName());
                        System.out.println("FAILURE: Exception Message: " + e.getMessage());
                        throw e;
                }
                var user = userRepository.findByEmail(request.getEmail())
                                .orElseThrow(() -> new RuntimeException("User not found"));
                var jwtToken = jwtService
                                .generateToken(new CustomUserDetailsService(userRepository)
                                                .loadUserByUsername(user.getEmail()));
                var refreshToken = createRefreshToken(user);

                return AuthPayloads.AuthResponse.builder()
                                .accessToken(jwtToken)
                                .refreshToken(refreshToken.getToken())
                                .user(dtoMapper.toUserDTO(user))
                                .build();
        }

        public AuthPayloads.AuthResponse refreshToken(String requestRefreshToken) {
                return refreshTokenRepository.findByToken(requestRefreshToken)
                                .map(token -> {
                                        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
                                                refreshTokenRepository.delete(token);
                                                throw new RuntimeException(
                                                                "Refresh token was expired. Please make a new signin request");
                                        }
                                        return token;
                                })
                                .map(token -> {
                                        String accessToken = jwtService
                                                        .generateToken(new CustomUserDetailsService(userRepository)
                                                                        .loadUserByUsername(
                                                                                        token.getUser().getEmail()));
                                        return AuthPayloads.AuthResponse.builder()
                                                        .accessToken(accessToken)
                                                        .refreshToken(requestRefreshToken)
                                                        .user(dtoMapper.toUserDTO(token.getUser()))
                                                        .build();
                                })
                                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
        }

        private RefreshToken createRefreshToken(User user) {
                RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
                                .orElse(new RefreshToken());

                refreshToken.setUser(user);
                refreshToken.setExpiryDate(Instant.now().plusMillis(refreshExpiration));
                refreshToken.setToken(UUID.randomUUID().toString());

                return refreshTokenRepository.save(refreshToken);
        }
}
