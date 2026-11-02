# Workflow diagrams

The first three diagrams show **CURRENT Citadel source behavior**. The final section marks future design proposals. They do not represent verified NotchHR internals.

## Leave approval (current)

```mermaid
stateDiagram-v2
    [*] --> Submitted: employee or PCCM submits
    Submitted --> PendingReviewDept: department head approves
    PendingReviewDept --> PendingReviewBusiness: business head approves
    PendingReviewBusiness --> PendingReviewHR: HR/PCCM approves
    PendingReviewHR --> Approved: final approval
    Submitted --> Rejected: current reviewer rejects
    PendingReviewDept --> Rejected: current reviewer rejects
    PendingReviewBusiness --> Rejected: current reviewer rejects
    PendingReviewHR --> Rejected: current reviewer rejects
    Submitted --> Cancelled: requester/reviewer cancels
```

Exact persisted labels are `Submitted`, `Pending Review`, `Approved`, `Rejected`, and `Cancelled`, with a separate `approval_stage` value. No balance ledger effects are currently performed.

## Attendance session (current)

```mermaid
stateDiagram-v2
    [*] --> Open: authenticated employee clocks in
    Open --> Closed: authorized clock-out
    Open --> Open: duplicate clock-in rejected with conflict
    Closed --> Closed: repeated clock-out rejected
```

## Payroll run (current)

```mermaid
stateDiagram-v2
    [*] --> Draft: generate calculation
    Draft --> Draft: regenerate through run path
    Draft --> Finalized: finalize transaction
    Finalized --> Finalized: regeneration rejected
```

The stored payroll run states and available review states should be confirmed before adding transitions. Current source has no explicit review/approval state machine.

## Proposed future workflow boundaries

These are independent designs pending policy decisions, not features verified in Citadel or NotchHR:

```mermaid
stateDiagram-v2
    [*] --> Requested: attendance correction submitted
    Requested --> Approved: scoped approver accepts
    Requested --> Rejected: scoped approver rejects with reason
    Approved --> Applied: original and corrected values audited
```

```mermaid
stateDiagram-v2
    [*] --> Draft: generate with immutable input/rule snapshot
    Draft --> Review: submit for review
    Review --> Draft: return with issues
    Review --> Approved: authorized approval
    Approved --> Finalized: transactional finalization
    Finalized --> Adjustment: later correction creates new run
```

```mermaid
stateDiagram-v2
    [*] --> Submitted: policy-validated leave request
    Submitted --> Approved: configured approval chain
    Submitted --> Rejected: authorized rejection
    Approved --> Cancelled: allowed cancellation plus reversal entry
```
