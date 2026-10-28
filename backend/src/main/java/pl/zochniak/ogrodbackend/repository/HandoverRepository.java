package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Handover;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HandoverRepository extends JpaRepository<Handover, Long> {
    List<Handover> findByReservationId(Long reservationId);
    List<Handover> findByEmployeeId(Long employeeId);
}