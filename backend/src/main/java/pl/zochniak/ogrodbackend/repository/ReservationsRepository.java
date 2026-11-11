package pl.zochniak.ogrodbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pl.zochniak.ogrodbackend.entity.Reservations;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReservationsRepository extends JpaRepository<Reservations, Long> {

    List<Reservations> findByUserId(Long userId);

    List<Reservations> findByStatus(ReservationStatus status);

    @Query("SELECT DISTINCT r FROM Reservations r " +
           "LEFT JOIN r.reservationItems ri " +
           "WHERE (r.itemId.id = :itemId OR ri.item.id = :itemId) " +
           "AND r.status <> pl.zochniak.ogrodbackend.entity.enums.ReservationStatus.CANCELLED")
    List<Reservations> findActiveByItemId(@Param("itemId") Long itemId);

    @Query("SELECT DISTINCT r FROM Reservations r " +
           "LEFT JOIN r.reservationItems ri " +
           "WHERE (r.itemId.id = :itemId OR ri.item.id = :itemId) " +
           "AND r.status <> pl.zochniak.ogrodbackend.entity.enums.ReservationStatus.CANCELLED " +
           "AND r.startTime < :endDate " +
           "AND r.endTime > :startDate")
    List<Reservations> findConflictingReservations(
            @Param("itemId") Long itemId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}