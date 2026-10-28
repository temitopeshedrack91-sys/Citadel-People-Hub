<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Entity;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $entities = [
            ['name' => 'Citadel Global Community Church (CGCC)', 'short_code' => 'CGCC', 'description' => 'Flagship church organization, ministry operations, pastoral care, and administrative functions.'],
            ['name' => 'Citadel School of Government', 'short_code' => 'CSOG', 'description' => 'Academic and leadership institution developing ethical governance leaders and policy practitioners.'],
            ['name' => 'Citadel Holdings', 'short_code' => 'Holdings', 'description' => 'Commercial and enterprise arm operating retail, hospitality, workspaces, and creative ventures.'],
        ];
        $entityIds = [];
        foreach ($entities as $attributes) {
            $entity = Entity::firstOrCreate(['short_code' => $attributes['short_code']], $attributes);
            $entityIds[$attributes['short_code']] = $entity->id;
        }

        $departments = [
            ['entity' => 'CGCC', 'name' => 'Finance', 'code' => 'CGCC-FIN'],
            ['entity' => 'CGCC', 'name' => 'People, Culture & Change', 'code' => 'CGCC-PCCM'],
            ['entity' => 'CGCC', 'name' => 'Facilities', 'code' => 'CGCC-FAC'],
            ['entity' => 'CGCC', 'name' => 'Security', 'code' => 'CGCC-SEC'],
            ['entity' => 'CGCC', 'name' => "S.O.'s Office / Admin", 'code' => 'CGCC-SO'],
            ['entity' => 'CGCC', 'name' => 'Protocol', 'code' => 'CGCC-PRO'],
            ['entity' => 'CGCC', 'name' => 'ICT', 'code' => 'CGCC-ICT'],
            ['entity' => 'CGCC', 'name' => 'Transport & Logistics', 'code' => 'CGCC-LOG'],
            ['entity' => 'CSOG', 'name' => 'Academy & Programmes', 'code' => 'CSOG-ACAD'],
            ['entity' => 'CSOG', 'name' => 'Admin & Operations', 'code' => 'CSOG-OPS'],
            ['entity' => 'Holdings', 'name' => 'Bookshop', 'code' => 'CH-BOOK'],
            ['entity' => 'Holdings', 'name' => 'Cafe', 'code' => 'CH-CAFE'],
            ['entity' => 'Holdings', 'name' => 'Workstation', 'code' => 'CH-WORK'],
            ['entity' => 'Holdings', 'name' => 'Asabi Aladire', 'code' => 'CH-ASABI'],
            ['entity' => 'Holdings', 'name' => 'Sales & Business Development', 'code' => 'CH-SBD'],
        ];
        foreach ($departments as $attributes) {
            Department::firstOrCreate(
                ['entity_id' => $entityIds[$attributes['entity']], 'code' => $attributes['code']],
                [
                    'name' => $attributes['name'],
                    'is_active' => true,
                ],
            );
        }
    }
}
