export const AUTO_MAP_PATTERNS: Record<string, string[]> = {
    firstName: ['firstname', 'first_name', 'first name', 'fname'],
    lastName: ['lastname', 'last_name', 'last name', 'lname'],
    email: ['email', 'e-mail', 'emailaddress', 'email_address'],
    phone: ['phone', 'phonenumber', 'phone_number', 'mobile', 'cell'],
    lastRenewalDate: ['lastrenewaldate', 'last_renewal_date', 'renewal_date', 'renewaldate'],
    classCredits: ['classcredits', 'class_credits', 'credits', 'remaining_credits', 'class credits'],
    paymentTermsLeft: ['paymenttermsleft', 'payment_terms_left', 'terms_left', 'payments_remaining', 'terms remaining'],
    backdateStartDate: ['backdate', 'backdate_start', 'backdate_start_date', 'original_start', 'start_date_backdate'],
    termEndDate: ['term_end_date', 'termenddate', 'end_date', 'plan_end_date', 'membership_end'],
    pricingPlanId: ['pricing_plan_id', 'pricingplanid', 'plan_id', 'planid', 'pricing_id', 'pricingid', 'pricingoptionid', 'pricing_option_id'],
}

export const FILE_TYPES = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .csv'


export const REQUIRED_FIELDS = [
    { key: 'firstName', label: 'First Name', description: 'Member\'s first name' },
    { key: 'lastName', label: 'Last Name', description: 'Member\'s last name' },
    { key: 'email', label: 'Email', description: 'Member\'s email address' },
    { key: 'phone', label: 'Phone', description: 'Member\'s phone number' },
    { key: 'lastRenewalDate', label: 'Last Renewal Date', description: 'Date of last membership renewal (YYYY-MM-DD)' },
]

export const OPTIONAL_FIELDS = [
    {
        key: 'pricingPlanId',
        label: 'Pricing Plan ID',
        description: 'Auto-assign members to pricing options via CSV values (advanced)',
        tooltip: 'When mapped, each member will be automatically assigned to the pricing option specified in this column. This disables manual plan selection in the next step. Values should be valid pricing option IDs from your existing plans.'
    },
    { key: 'classCredits', label: 'Class Credits', description: 'Number of class credits (optional)' },
    {
        key: 'paymentTermsLeft',
        label: 'Payment Terms Left',
        description: 'Remaining payment terms (optional)',
        tooltip: 'If Term End Date is also provided, it will take precedence over this value'
    },
    { key: 'backdateStartDate', label: 'Backdate Start Date', description: 'Original start date for backdating (YYYY-MM-DD, optional)' },
    {
        key: 'termEndDate',
        label: 'Term End Date',
        description: 'End date of current plan term (YYYY-MM-DD, optional)',
        tooltip: 'If provided, this will override the Payment Terms Left value'
    },
]