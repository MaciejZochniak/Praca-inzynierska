package pl.zochniak.ogrodbackend.dto.response;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;
import lombok.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationResponse {
    private Long id;
    private Long reservationId;
    private Long itemId;
    private String itemName;
    private ReservationStatus status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private BigDecimal totalPrice;
    private String message;
}