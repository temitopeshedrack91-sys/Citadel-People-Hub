<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClaimExpense extends Model
{
    use HasFactory;

    protected $fillable = [
        'claim_request_id',
        'expense_type_id',
        'expense_date',
        'amount',
        'currency',
        'note',
        'receipt_url',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date:Y-m-d',
    ];

    public function claimRequest(): BelongsTo
    {
        return $this->belongsTo(ClaimRequest::class, 'claim_request_id');
    }

    public function expenseType(): BelongsTo
    {
        return $this->belongsTo(ExpenseType::class, 'expense_type_id');
    }
}
