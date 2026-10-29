<?php

namespace App\Http\Controllers\Api;

use App\Business\Ops\OpsDashboardService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpsDashboardController extends Controller
{
    public function __construct(private readonly OpsDashboardService $ops) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->ops->snapshot(
            $request->user(),
            $request->string('area')->toString() ?: null,
            $request->boolean('personal'),
        ));
    }
}
