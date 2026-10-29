<?php

namespace App\Http\Controllers\Api;

use App\Business\Documents\DocumentService;
use App\Common\Dto\PaginationDto;
use App\Http\Controllers\Api\Concerns\CrudController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends CrudController
{
    public function __construct(private readonly DocumentService $documents)
    {
        parent::__construct($documents);
    }

    protected function rules(bool $partial = false): array
    {
        return [
            'title' => 'required|string|max:220',
            'doc_type_id' => 'required|integer',
            'owner_area_id' => 'required|integer',
            'summary' => 'nullable|string|max:500',
            'body_text' => 'nullable|string',
            'file_url' => 'nullable|url:http,https|max:400',
            'file' => $partial ? 'prohibited' : 'nullable|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png',
            'status' => 'sometimes|in:Borrador,Vigente,Obsoleto',
            'effective_on' => 'nullable|date',
            'expires_on' => 'nullable|date|after_or_equal:effective_on',
            'code' => 'nullable|string|max:40',
        ];
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->documents->listForUser(
            PaginationDto::fromRequest($request->all()),
            $request->user(),
        ));
    }

    public function show(int $id): JsonResponse
    {
        return response()->json($this->documents->getForUser($id, request()->user()));
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->toDatabase($this->validated($request));
        $payload['creado_por'] = $request->user()?->getKey();

        unset($payload['file']);
        return response()->json($this->documents->createForUser($payload, $request->user(), $request->file('file')), 201);
    }

    public function download(int $id, Request $request): StreamedResponse
    {
        $document = $this->documents->getForUser($id, $request->user());
        $path = $document->enlace_archivo;
        abort_unless($path && str_starts_with($path, 'documents/') && Storage::disk('local')->exists($path), 404, 'Archivo no encontrado.');
        return Storage::disk('local')->response($path, basename($path), [], $request->boolean('preview') ? 'inline' : 'attachment');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return response()->json($this->documents->updateForUser(
            $id,
            $this->toDatabase($this->validated($request, true)),
            $request->user(),
        ));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->documents->deleteForUser($id, request()->user());

        return response()->json(['ok' => true]);
    }

    public function publish(int $id, Request $request): JsonResponse
    {
        $this->documents->getForUser($id, $request->user());

        return response()->json($this->documents->publish($id, $request->user()?->getKey()));
    }

    public function obsolete(int $id, Request $request): JsonResponse
    {
        $this->documents->getForUser($id, $request->user());

        return response()->json($this->documents->obsolete($id));
    }

    public function version(int $id, Request $request): JsonResponse
    {
        $this->documents->getForUser($id, $request->user());
        $data = $request->validate([
            'body_text' => 'nullable|string',
            'file_url' => 'nullable|url:http,https|max:400',
            'change_note' => 'nullable|string|max:300',
            'status' => 'sometimes|in:Borrador,Vigente,Obsoleto',
        ]);

        return response()->json($this->documents->newVersion($id, $this->toDatabase($data), $request->user()?->getKey()));
    }

    private function toDatabase(array $payload): array
    {
        $map = [
            'title' => 'titulo', 'doc_type_id' => 'id_tipo_documento',
            'owner_area_id' => 'id_area_propietaria', 'summary' => 'resumen',
            'body_text' => 'contenido', 'file_url' => 'enlace_archivo',
            'status' => 'estado', 'effective_on' => 'vigente_desde',
            'expires_on' => 'vigente_hasta', 'code' => 'codigo',
            'change_note' => 'motivo_cambio',
        ];
        foreach ($map as $api => $database) {
            if (array_key_exists($api, $payload)) {
                $payload[$database] = $payload[$api];
                unset($payload[$api]);
            }
        }

        return $payload;
    }
}
