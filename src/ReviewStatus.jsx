import { CircleCheck, CircleX, Clock } from 'lucide-react'

const reviewStatusInfo = {
  pending: { label: 'Đang chờ duyệt', Icon: Clock },
  accepted: { label: 'Đã được duyệt', Icon: CircleCheck },
  rejected: { label: 'Không được duyệt', Icon: CircleX },
}

// Tích xanh = được duyệt, dấu X đỏ = bị từ chối, đồng hồ vàng = đang chờ
function ReviewStatus({ status }) {
  const { label, Icon } = reviewStatusInfo[status] ?? reviewStatusInfo.pending
  return (
    <span className={`review-status review-status-${status in reviewStatusInfo ? status : 'pending'}`}>
      <Icon size={14} aria-hidden="true" /> {label}
    </span>
  )
}

export default ReviewStatus
