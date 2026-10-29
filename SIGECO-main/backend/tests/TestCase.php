<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['services.slack.notifications.bot_user_oauth_token' => null]);
        \Illuminate\Support\Facades\Http::preventStrayRequests();
    }
}
