<?php

namespace App\Providers;

use App\Data\Contracts\AssetAssignmentRepositoryInterface;
use App\Data\Contracts\AssetMaintenanceRepositoryInterface;
use App\Data\Contracts\AssetRepositoryInterface;
use App\Data\Contracts\AuthRepositoryInterface;
use App\Data\Contracts\InternalAreaRepositoryInterface;
use App\Data\Contracts\InternalOrderRepositoryInterface;
use App\Data\Contracts\LookupRepositoryInterface;
use App\Data\Contracts\OpsDashboardRepositoryInterface;
use App\Data\Contracts\SlaRepositoryInterface;
use App\Data\Contracts\TeamRepositoryInterface;
use App\Data\Eloquent\AssetAssignmentRepository;
use App\Data\Eloquent\AssetMaintenanceRepository;
use App\Data\Eloquent\AssetRepository;
use App\Data\Eloquent\AuthRepository;
use App\Data\Eloquent\InternalAreaRepository;
use App\Data\Eloquent\InternalOrderRepository;
use App\Data\Eloquent\LookupRepository;
use App\Data\Eloquent\OpsDashboardRepository;
use App\Data\Eloquent\SlaRepository;
use App\Data\Eloquent\TeamRepository;
use Illuminate\Support\ServiceProvider;

class DomainServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AuthRepositoryInterface::class, AuthRepository::class);
        $this->app->bind(InternalAreaRepositoryInterface::class, InternalAreaRepository::class);
        $this->app->bind(InternalOrderRepositoryInterface::class, InternalOrderRepository::class);
        $this->app->bind(LookupRepositoryInterface::class, LookupRepository::class);
        $this->app->bind(OpsDashboardRepositoryInterface::class, OpsDashboardRepository::class);
        $this->app->bind(TeamRepositoryInterface::class, TeamRepository::class);
        $this->app->bind(AssetRepositoryInterface::class, AssetRepository::class);
        $this->app->bind(AssetAssignmentRepositoryInterface::class, AssetAssignmentRepository::class);
        $this->app->bind(AssetMaintenanceRepositoryInterface::class, AssetMaintenanceRepository::class);
        $this->app->bind(SlaRepositoryInterface::class, SlaRepository::class);
    }
}
