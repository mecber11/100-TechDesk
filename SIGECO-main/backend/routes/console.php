<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('slack:send-pending')->everyMinute()->withoutOverlapping();
