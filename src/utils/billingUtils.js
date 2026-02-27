/**
 * Carry forward advance/pending for future months only, starting from the selected month.
 *
 * @param {object} monthlyBilling - The customer's monthlyBilling object (will not be mutated).
 * @param {number} selectedMonth - The month being edited (1-based, 1-12).
 * @param {number} selectedYear - The year being edited.
 * @param {object} userBilling - The user-entered values for the selected month: { advance, pending, paidAmount, entries, milkPrice }
 * @param {number} maxCarryForwardMonths - How many months to project forward (default 2)
 * @returns {object} - A new monthlyBilling object with correct carryforward for future months.
 */
export function carryForwardBilling(
  monthlyBilling,
  selectedMonth,
  selectedYear,
  userBilling,
  maxCarryForwardMonths = 2
) {
  // Convert 1-based month to 0-based for internal calculations
  const month0Based = selectedMonth - 1;
  
  // Clone the billing object so we don't mutate original
  const newBilling = { ...monthlyBilling };
  const getNextMonthYear = (month, year) => {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    return { nextMonth, nextYear };
  };
  const billingKey = `${selectedYear}-${selectedMonth}`;

  // 1. Set the selected month's billing to user input
  newBilling[billingKey] = {
    ...newBilling[billingKey],
    advance: userBilling.advance || 0,
    pending: userBilling.pending || 0,
    paidAmount: userBilling.paidAmount || 0,
    milkPrice: parseFloat(userBilling.milkPrice) || 0,
    // You can add more fields as needed
  };

  // 2. Calculate due for the selected month
  const entries = userBilling.entries || [];
  const price = parseFloat(userBilling.milkPrice) || 0;
  const totalMilk = entries.reduce((s, e) => s + (e.morning || 0) + (e.evening || 0), 0);
  const amount = totalMilk * price;
  let due = amount - (userBilling.advance || 0) + (userBilling.pending || 0) - (userBilling.paidAmount || 0);

  // 3. Carry forward for future months only
  let currentMonth = month0Based;
  let currentYear = selectedYear;
  let currentBillingKey = billingKey;
  let carryForwardCount = 0;

  // Always carry forward milkPrice to all future months (unless already set)
  let lastMilkPrice = newBilling[billingKey]?.milkPrice || 0;
  while (carryForwardCount < maxCarryForwardMonths) {
    const { nextMonth, nextYear } = getNextMonthYear(currentMonth, currentYear);
    const nextMonth1Based = nextMonth + 1; // Convert back to 1-based for billing key
    const nextBillingKey = `${nextYear}-${nextMonth1Based}`;
    
    // Only set milkPrice if not already set for the next month
    if (!newBilling[nextBillingKey] || newBilling[nextBillingKey].milkPrice === undefined) {
      newBilling[nextBillingKey] = {
        ...newBilling[nextBillingKey],
        milkPrice: lastMilkPrice,
      };
    }

    // Carry forward advance/pending/paidAmount as before
    if (due < 0) {
      newBilling[nextBillingKey] = {
        ...newBilling[nextBillingKey],
        advance: Math.abs(due),
        pending: 0,
        paidAmount: 0,
        carriedFrom: currentBillingKey,
        carriedAmount: Math.abs(due),
        carriedType: 'advance',
      };
    } else if (due > 0) {
      newBilling[nextBillingKey] = {
        ...newBilling[nextBillingKey],
        advance: 0,
        pending: due,
        paidAmount: 0,
        carriedFrom: currentBillingKey,
        carriedAmount: due,
        carriedType: 'pending',
      };
    }

    // Prepare for next loop
    currentMonth = nextMonth;
    currentYear = nextYear;
    currentBillingKey = nextBillingKey;
    // For future months, assume no new entries, so amount = 0
    due = -((newBilling[currentBillingKey]?.advance || 0)) + ((newBilling[currentBillingKey]?.pending || 0));
    // Update lastMilkPrice for next carry forward
    if (newBilling[currentBillingKey]?.milkPrice !== undefined) {
      lastMilkPrice = newBilling[currentBillingKey].milkPrice;
    }
    carryForwardCount++;
  }
  
  return newBilling;
} 