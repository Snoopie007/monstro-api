import { OTPEmailTemplate } from './OTPEmail'
import { ResetPasswordEmail } from './ResetPasswordEmail'
import { ResetSuccessEmail } from './ResetSuccessEmail'
import { SimpleOTPEmail } from './SimpleOTP'
import { InviteEmailTemplate } from './MemberInvite'
import { UpdateEmailOTP } from './UpdateEmailOTP'
import InvoiceReminderEmail from './InvoiceReminderEmail'
import PaymentSuccessEmail from './PaymentSuccessEmail'


export const EmailTemplates = {
    OTPEmail: OTPEmailTemplate,
    ResetPasswordEmail,
    ResetSuccessEmail,
    SimpleOTPEmail,
    InviteEmailTemplate,
    UpdateEmailOTP,
    InvoiceReminderEmail,
    PaymentSuccessEmail
}