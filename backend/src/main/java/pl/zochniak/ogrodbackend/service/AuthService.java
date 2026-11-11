package pl.zochniak.ogrodbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.zochniak.ogrodbackend.dto.response.AuthResponse;
import pl.zochniak.ogrodbackend.dto.request.LoginRequest;
import pl.zochniak.ogrodbackend.dto.request.RegisterRequest;
import pl.zochniak.ogrodbackend.entity.User;
import pl.zochniak.ogrodbackend.entity.enums.Role;
import pl.zochniak.ogrodbackend.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            throw new IllegalArgumentException("Adres email oraz hasło są wymagane.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Użytkownik o podanym adresie email już istnieje.");
        }

        // Zapis użytkownika bcrypt dla hasla
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phoneNumber(request.getPhoneNumber())
                .role(Role.CLIENT)
                .build();

        User savedUser = userRepository.save(user);

        return AuthResponse.builder()
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .role(savedUser.getRole())
                .message("Rejestracja zakończona sukcesem.")
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            throw new IllegalArgumentException("Email i hasło są wymagane.");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Nieprawidłowy adres email lub hasło."));

        // Weryfikacja hasła
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Nieprawidłowy adres email lub hasło.");
        }

        return AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .message("Logowanie udane.")
                .build();
    }
    @Transactional
public AuthResponse updateProfile(Long userId, RegisterRequest request) {
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono użytkownika"));

    if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
    if (request.getLastName() != null) user.setLastName(request.getLastName());
    if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());

    // Weryfikacja do zmiany hasla
    if (request.getPassword() != null && !request.getPassword().isBlank()) {
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new IllegalArgumentException("Wymagane jest podanie obecnego hasła.");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Podane obecne hasło jest nieprawidłowe.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
    }

    User updated = userRepository.save(user);
    return AuthResponse.builder()
            .userId(updated.getId())
            .email(updated.getEmail())
            .firstName(updated.getFirstName())
            .lastName(updated.getLastName())
            .role(updated.getRole())
            .message("Profil zaktualizowany pomyślnie.")
            .build();
    }
}
