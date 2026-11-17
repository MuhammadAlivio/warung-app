<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

/** Profil toko untuk struk & faktur (tabel store_profiles, satu baris; lihat database/sql/003_profil_toko.sql). */
#[Fillable(['name', 'phone', 'address'])]
#[Hidden(['logo'])]
class StoreProfile extends Model
{
    public const ID = 1;

    /** Sama dengan 003_profil_toko.sql dan DEFAULT_PROFILE di frontend. */
    public const DEFAULTS = [
        'name' => 'U. D. Lestari',
        'phone' => '022-7301234',
        'address' => 'Jl. KH. Mas Mansyur No.40, RT.002/RW.010,',
    ];

    public $incrementing = false;

    /** Baris profil; dibuat dengan nilai bawaan bila belum ada. */
    public static function current(): self
    {
        return static::query()->firstOrCreate(['id' => self::ID], self::DEFAULTS);
    }

    public function hasLogo(): bool
    {
        return filled($this->logo) && filled($this->logo_mime);
    }

    public function toApi(): array
    {
        return [
            'name' => $this->name,
            'phone' => $this->phone,
            'address' => $this->address,
            // ?v= berubah setiap profil disimpan, supaya cache browser ikut diperbarui
            'logo_url' => $this->hasLogo() ? '/api/store-profile/logo?v='.$this->updated_at?->timestamp : null,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
