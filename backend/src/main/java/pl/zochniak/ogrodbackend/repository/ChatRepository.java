package pl.zochniak.ogrodbackend.repository;
import pl.zochniak.ogrodbackend.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ChatRepository extends JpaRepository<Chat, Long> {
    List<Chat> findByReservationIdOrderBySentAtAsc(Long reservationId);
    @Query("SELECT c FROM Chat c WHERE "+"(c.sender.id = :u1 AND c.recipient.id = :u2) OR "+
           "(c.sender.id = :u2 AND c.recipient.id = :u1) "+"ORDER BY c.sentAt ASC")
    List<Chat> findConversationBetweenUsers(@Param("u1") Long userOneId, @Param("u2") Long userTwoId);
}