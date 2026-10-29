<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

class LayerArchitectureTest extends TestCase
{
    public function test_http_layer_does_not_access_domain_or_data_layers_directly(): void
    {
        foreach ($this->phpFiles(dirname(__DIR__, 2).'/app/Http') as $file) {
            $source = file_get_contents($file);
            $this->assertStringNotContainsString('use App\\Domain\\', $source, $file);
            $this->assertStringNotContainsString('use App\\Data\\', $source, $file);
            $this->assertStringNotContainsString('Support\\Facades\\DB', $source, $file);
            $this->assertStringNotContainsString('::query(', $source, $file);
        }
    }

    public function test_business_services_do_not_execute_database_queries(): void
    {
        foreach ($this->phpFiles(dirname(__DIR__, 2).'/app/Business') as $file) {
            $source = file_get_contents($file);
            $this->assertStringNotContainsString('Support\\Facades\\DB', $source, $file);
            $this->assertStringNotContainsString('::query(', $source, $file);
            $this->assertStringNotContainsString('::findOrFail(', $source, $file);
        }
    }

    /** @return list<string> */
    private function phpFiles(string $directory): array
    {
        $files = [];
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory));
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }

        return $files;
    }
}
