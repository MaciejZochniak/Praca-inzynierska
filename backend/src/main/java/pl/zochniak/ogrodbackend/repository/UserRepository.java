package pl.zochniak.ogrodbackend.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.zochniak.ogrodbackend.entity.User;
import pl.zochniak.ogrodbackend.entity.enums.Role;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRoleOrderByIdAsc(Role role);
}