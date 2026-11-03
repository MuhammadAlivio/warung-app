<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'phone', 'address', 'notes'])]
class Customer extends Model
{
    /** Bentuk yang dipakai frontend (kolom notes -> note). */
    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'address' => $this->address,
            'note' => $this->notes,
        ];
    }
}
