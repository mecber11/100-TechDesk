<?php

namespace App\Common\Exceptions;

use RuntimeException;

class DomainException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $codeKey = 'DOMAIN_ERROR',
        public readonly int $httpStatus = 422
    ) {
        parent::__construct($message);
    }
}
