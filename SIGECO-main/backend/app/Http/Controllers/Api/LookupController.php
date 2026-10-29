<?php

namespace App\Http\Controllers\Api;

use App\Business\Lookups\LookupService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class LookupController extends Controller
{
    public function __construct(private readonly LookupService $lookups) {}

    public function index(): JsonResponse
    {
        return response()->json($this->lookups->all());
    }
}
