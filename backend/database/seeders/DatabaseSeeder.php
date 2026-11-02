<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Akun awal untuk uji coba login.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'syahban@gmail.com'],
            [
                'name' => 'Syahban',
                'password' => 'Syahban@2026',
                'role' => 'admin',
                'is_active' => true,
            ],
        );

        User::updateOrCreate(
            ['email' => 'kasir@gmail.com'],
            [
                'name' => 'Kasir Warung',
                'password' => 'Kasir@2026',
                'role' => 'kasir',
                'is_active' => true,
            ],
        );
    }
}
