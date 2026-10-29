<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Business\Crud\CrudService;
use App\Common\Dto\PaginationDto;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class CrudController extends Controller
{
    public function __construct(protected CrudService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->service->list(PaginationDto::fromRequest($request->all())));
    }

    public function show(int $id): JsonResponse
    {
        return response()->json($this->service->get($id));
    }

    public function store(Request $request): JsonResponse
    {
        $entity = $this->service->create($this->validated($request));

        return response()->json($entity, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return response()->json($this->service->update($id, $this->validated($request, true)));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->service->delete($id);

        return response()->json(['ok' => true]);
    }

    abstract protected function rules(bool $partial = false): array;

    protected function validated(Request $request, bool $partial = false): array
    {
        $rules = $this->rules($partial);
        if ($partial) {
            foreach ($rules as $key => $rule) {
                if (is_string($rule) && ! str_starts_with($rule, 'sometimes')) {
                    $rules[$key] = 'sometimes|'.$rule;
                }
            }
        }

        return $request->validate($rules);
    }
}
