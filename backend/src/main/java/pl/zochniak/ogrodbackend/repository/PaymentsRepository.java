package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Payments;
import pl.zochniak.ogrodbackend.entity.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
public interface PaymentsRepository extends JpaRepository<Payments, Long> {
    Optional<Payments> findByReservationId(Long reservationId);
    List<Payments> findByStatus(PaymentStatus status);
}