/**
 * Exact definitions of every dashboard figure, matching the backend services
 * (backend/src/dashboard/services) word for word with the root README
 * "Dashboards" table. KpiTile tooltips read from here; keep the two in sync.
 */
export const DEFINITIONS = {
  admin: {
    todayOrders:
      "Orders whose delivery date is today's business date, in any status except Cancelled and Rejected (drafts and placed orders count). Grouped by delivery date, not by when the order was made.",
    todayBillable:
      "Sum of the billable amount frozen at cut-off confirmation for orders delivering today. Includes orders cancelled after confirmation. Drafts and placed orders have no billable amount yet and add nothing. 0 when there are none.",
    uninvoiced:
      "Sum of billable amounts on orders that are not on any invoice yet, across all delivery dates. Includes confirmed-then-cancelled orders; orders cancelled before cut-off are never billable.",
    lateKitchen:
      "Confirmed orders on any delivery date that are not kitchen-ready, still have unfinished prep units, and whose planned kitchen-ready time (delivery time − company lead minutes − kitchen buffer) has passed. Sub-line: their unfinished prep units. Cancelled orders are excluded.",
    activeDeliveries:
      "Drops scheduled for today's business date that are Ready to leave or Out for delivery. Delivered drops are excluded.",
  },
  kitchen: {
    notStarted:
      "Prep units of confirmed orders delivering today that have no start time. Units of orders cancelled after confirmation are excluded.",
    started: "Prep units of confirmed orders delivering today that have a start time but no done time.",
    atRisk:
      "Unfinished prep units of confirmed orders delivering today whose planned kitchen-ready time is less than the at-risk window away but has not passed yet.",
    late: "Unfinished prep units of confirmed orders delivering today whose planned kitchen-ready time has passed. Exactly at the deadline counts as late.",
    nextDeadline:
      "The earliest planned kitchen-ready time among today's unfinished prep units, with that order's remaining unit count. Empty when everything is done.",
  },
  dispatch: {
    dispatchReady: "Drops scheduled for today's business date that are Ready to leave, with or without a driver.",
    unassigned: "Today's Ready-to-leave drops with no driver assigned.",
    outForDelivery: "Today's drops that are Out for delivery.",
    lateDeliveries:
      "Today's drops whose scheduled delivery time has passed and that are not delivered yet (ready or out for delivery). Drops already delivered late are not counted.",
  },
  driver: {
    todayDrops: "Drops assigned to you and scheduled for today's business date, in any status.",
    delivered: "Your drops today that are delivered.",
    remaining: "Your drops today that are not delivered yet.",
    nextDrop: "Your earliest drop today that is not delivered yet.",
  },
} as const;
