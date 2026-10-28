package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Reservations;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationsRepository extends JpaRepository<Reservations, Long> {
    List<Reservations> findByUserId(Long userId);
    List<Reservations> findByAssignedEmployeeId(Long employeeId);
    List<Reservations> findByStatus(ReservationStatus status);
    @Query("SELECT r FROM Reservations r "+"JOIN r.reservationItems ri "+"WHERE ri.item.id = :itemId "+
           "AND r.status <> :excludedStatus "+"AND r.startDate < :endDate "+"AND r.endDate > :startDate")
    List<Reservations> findConflictingReservations(
            @Param("itemId") Long itemId, @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}