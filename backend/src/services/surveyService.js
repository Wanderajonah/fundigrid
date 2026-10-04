// Quantity-surveyor stage of a service request.
//
// A request is created, an admin assigns a surveyor, the surveyor submits a
// costed estimate, and only then does the request become available to fundis.
// The stage lives in `bookings.surveyStatus` beside `bookings.status`, which
// keeps its original eight values, so every status map in the app is untouched.

const STAGES = ["AWAITING_ASSIGNMENT", "SURVEYOR_ASSIGNED", "ESTIMATE_READY"];

const ASSIGNABLE = ["AWAITING_ASSIGNMENT", "SURVEYOR_ASSIGNED"];

/**
 * NULL means the row was written before this stage existed. Those bookings
 * already carry a rate-card estimate, so they read as "already past the gate"
 * instead of blocking a fundi forever.
 */
function surveyStage(booking) {
  const value = booking && booking.surveyStatus;
  return STAGES.includes(value) ? value : "ESTIMATE_READY";
}

/** A fundi may only accept once the surveyor's estimate is in. */
function readyForFundi(booking) {
  return surveyStage(booking) === "ESTIMATE_READY";
}

/**
 * Client-facing timeline, "what happened up to the estimate".
 *
 * Four labels but only three events (created, assigned, submitted), so the
 * last two steps complete together — the estimate arriving *is* the survey
 * finishing. Rows outside the stage report everything done.
 */
function progressSteps(booking) {
  const row = booking || {};
  const inFlow = STAGES.includes(row.surveyStatus);
  const assigned = !inFlow || Boolean(row.surveyorId || row.assignedAt);
  const submitted = !inFlow || Boolean(row.estimateSubmittedAt) || surveyStage(row) === "ESTIMATE_READY";

  const steps = [
    { key: "submitted", label: "Request submitted", at: row.created_at || null, done: true },
    {
      key: "review",
      label: "Under review by admin",
      at: assigned ? row.assignedAt || row.created_at || null : null,
      done: assigned,
    },
    {
      key: "survey",
      label: "Surveyor measuring the job",
      at: assigned ? row.assignedAt || null : null,
      done: submitted,
    },
    {
      key: "estimate",
      label: "Estimate ready",
      at: submitted ? row.estimateSubmittedAt || row.assignedAt || row.created_at || null : null,
      done: submitted,
    },
  ];

  // The first unfinished step is where the request is sitting right now.
  const current = steps.find((step) => !step.done);
  return steps.map((step) => ({
    ...step,
    status: step.done ? "completed" : step === current ? "current" : "pending",
  }));
}

/** Admin may re-assign only while a surveyor still owes an estimate. */
function isAssignable(booking) {
  return ASSIGNABLE.includes(surveyStage(booking));
}

module.exports = { STAGES, surveyStage, readyForFundi, progressSteps, isAssignable };
