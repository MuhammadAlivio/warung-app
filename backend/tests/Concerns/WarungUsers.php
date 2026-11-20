<?php

namespace Tests\Concerns;

use App\Models\User;

/**
 * Bantuan tes untuk login, pelanggan, karyawan, dan log. Skema dari SQL (bukan migration), jadi
 * tesnya dijalankan ke Postgres dan di-rollback per tes:
 *
 *   DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test --filter=AuthTest
 */
trait WarungUsers
{
    protected function requirePostgres(): void
    {
        if (config('database.default') !== 'pgsql') {
            $this->markTestSkipped('Butuh Postgres: DB_CONNECTION=pgsql DB_DATABASE=postgres php artisan test');
        }
    }

    protected function makeUser(string $role = 'kasir', array $attributes = []): User
    {
        return User::forceCreate([
            'name' => ucfirst($role).' Uji',
            'email' => $role.'.'.uniqid().'@example.com',
            'password' => 'PasswordUji12345',
            'role' => $role,
            'is_active' => true,
            ...$attributes,
        ]);
    }
}
