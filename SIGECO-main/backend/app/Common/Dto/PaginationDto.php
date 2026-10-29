<?php

namespace App\Common\Dto;

final class PaginationDto
{
    public function __construct(
        public readonly int $page = 1,
        public readonly int $perPage = 20,
        public readonly ?string $search = null,
        public readonly ?string $sort = null
    ) {}

    public static function fromRequest(array $input): self
    {
        return new self(
            page: max(1, (int) ($input['page'] ?? 1)),
            perPage: min(100, max(1, (int) ($input['per_page'] ?? 20))),
            search: $input['q'] ?? null,
            sort: $input['sort'] ?? null
        );
    }
}
