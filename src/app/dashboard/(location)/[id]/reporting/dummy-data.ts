
export const newCustomersData = [
    { month: "January", customers: 15 },
    { month: "February", customers: 28 },
    { month: "March", customers: 22 },
    { month: "April", customers: 31 },
    { month: "May", customers: 19 },
    { month: "June", customers: 25 },
    { month: "July", customers: 33 },
    { month: "August", customers: 27 },
    { month: "September", customers: 38 },
    { month: "October", customers: 29 },
    { month: "November", customers: 35 },
    { month: "December", customers: 42 },
]


export const totalGrossRevenueData = [
    { month: "January", revenue: 50000 },
    { month: "February", revenue: 48000 },
    { month: "March", revenue: 53000 },
    { month: "April", revenue: 51000 },
    { month: "May", revenue: 55000 },
    { month: "June", revenue: 54000 },
    { month: "July", revenue: 58000 },
    { month: "August", revenue: 56000 },
    { month: "September", revenue: 60000 },
    { month: "October", revenue: 58000 },
    { month: "November", revenue: 63000 },
    { month: "December", revenue: 61000 },
]


export const recurringRevenueData = [
    { month: "January", amount: 50000 },
    { month: "February", amount: 48000 },
    { month: "March", amount: 53000 },
    { month: "April", amount: 51000 },
    { month: "May", amount: 55000 },
    { month: "June", amount: 54000 },
    { month: "July", amount: 58000 },
    { month: "August", amount: 56000 },
    { month: "September", amount: 60000 },
    { month: "October", amount: 58000 },
    { month: "November", amount: 63000 },
    { month: "December", amount: 61000 },
]

export const topCustomerSpendersData = [
    { memberId: 1, firstName: "John", lastName: "Doe", email: "john.doe@example.com", spend: 100 },
    { memberId: 2, firstName: "Jane", lastName: "Smith", email: "jane.smith@example.com", spend: 80 },
    { memberId: 3, firstName: "Alice", lastName: "Johnson", email: "alice.johnson@example.com", spend: 70 },
    { memberId: 4, firstName: "Bob", lastName: "Brown", email: "bob.brown@example.com", spend: 60 },
]

export const customerLTVData = [
    // January: total = 10000 + 15000 + 20000 = 45000
    { month: "January", memberId: 1, amount: 10000 },
    { month: "January", memberId: 2, amount: 15000 },
    { month: "January", memberId: 3, amount: 20000 },

    // February: total = 11000 + 16000 + 21000 = 48000
    { month: "February", memberId: 4, amount: 11000 },
    { month: "February", memberId: 5, amount: 16000 },
    { month: "February", memberId: 6, amount: 21000 },

    // March: total = 12000 + 17000 + 22000 = 51000
    { month: "March", memberId: 7, amount: 12000 },
    { month: "March", memberId: 8, amount: 17000 },
    { month: "March", memberId: 9, amount: 22000 },

    // April: total = 13000 + 18000 + 23000 = 54000
    { month: "April", memberId: 10, amount: 13000 },
    { month: "April", memberId: 11, amount: 18000 },
    { month: "April", memberId: 12, amount: 23000 },

    // May: total = 14000 + 19000 + 24000 = 57000
    { month: "May", memberId: 13, amount: 14000 },
    { month: "May", memberId: 14, amount: 19000 },
    { month: "May", memberId: 15, amount: 24000 },

    // June: total = 15000 + 20000 + 25000 = 60000
    { month: "June", memberId: 16, amount: 15000 },
    { month: "June", memberId: 17, amount: 20000 },
    { month: "June", memberId: 18, amount: 25000 },

    // July: total = 16000 + 21000 + 26000 = 63000
    { month: "July", memberId: 19, amount: 16000 },
    { month: "July", memberId: 20, amount: 21000 },
    { month: "July", memberId: 21, amount: 26000 },

    // August: total = 17000 + 22000 + 27000 = 66000
    { month: "August", memberId: 22, amount: 17000 },
    { month: "August", memberId: 23, amount: 22000 },
    { month: "August", memberId: 24, amount: 27000 },

    // September: total = 18000 + 23000 + 28000 = 69000
    { month: "September", memberId: 25, amount: 18000 },
    { month: "September", memberId: 26, amount: 23000 },
    { month: "September", memberId: 27, amount: 28000 },

    // October: total = 19000 + 24000 + 29000 = 72000
    { month: "October", memberId: 28, amount: 19000 },
    { month: "October", memberId: 29, amount: 24000 },
    { month: "October", memberId: 30, amount: 29000 },

    // November: total = 20000 + 25000 + 30000 = 75000
    { month: "November", memberId: 31, amount: 20000 },
    { month: "November", memberId: 32, amount: 25000 },
    { month: "November", memberId: 33, amount: 30000 },

    // December: total = 21000 + 26000 + 31000 = 78000
    { month: "December", memberId: 34, amount: 21000 },
    { month: "December", memberId: 35, amount: 26000 },
    { month: "December", memberId: 36, amount: 31000 },
];


export const customerChurnData = [
    { memberId: 1, month: "January", status: "Canceled", caneceledAt: "2024-01-01", createdAt: "2023-01-01" },
    { memberId: 2, month: "February", status: "Active", caneceledAt: null, createdAt: "2023-02-01" },
    { memberId: 3, month: "March", status: "Active", caneceledAt: null, createdAt: "2023-03-01" },
    { memberId: 4, month: "April", status: "Active", caneceledAt: null, createdAt: "2023-04-01" },
    { memberId: 5, month: "May", status: "Active", caneceledAt: null, createdAt: "2023-05-01" },
    { memberId: 6, month: "June", status: "Active", caneceledAt: null, createdAt: "2023-06-01" },
    { memberId: 7, month: "July", status: "Active", caneceledAt: null, createdAt: "2023-07-01" },
    { memberId: 8, month: "August", status: "Active", caneceledAt: null, createdAt: "2023-08-01" },
    { memberId: 9, month: "September", status: "Active", caneceledAt: null, createdAt: "2023-09-01" },
    { memberId: 10, month: "October", status: "Active", caneceledAt: null, createdAt: "2023-10-01" },

]
