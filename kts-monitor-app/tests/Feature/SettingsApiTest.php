<?php

namespace Tests\Feature;

use App\Mail\OutageTestMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_endpoints_require_authentication(): void
    {
        $this->getJson('/api/settings/monitor-interval')->assertUnauthorized();
        $this->postJson('/api/settings/monitor-interval', ['interval_minutes' => 10])->assertUnauthorized();

        $this->getJson('/api/settings/monitor-interval-light')->assertUnauthorized();
        $this->postJson('/api/settings/monitor-interval-light', ['interval_minutes' => 10])->assertUnauthorized();

        $this->getJson('/api/settings/alert-email')->assertUnauthorized();
        $this->postJson('/api/settings/alert-email', ['recipient_email' => 'gondocs.robert@gmail.com'])->assertUnauthorized();
        $this->postJson('/api/settings/alert-email/test')->assertUnauthorized();

        $this->getJson('/api/settings/log-retention')->assertUnauthorized();
        $this->postJson('/api/settings/log-retention', ['retention_days' => 30])->assertUnauthorized();
    }

    public function test_monitor_interval_can_be_read_and_updated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/settings/monitor-interval')
            ->assertOk()
            ->assertJson([
                'interval_minutes' => (int) config('app.monitor_interval_minutes'),
            ]);

        $this->postJson('/api/settings/monitor-interval', ['interval_minutes' => 25])
            ->assertOk()
            ->assertJson([
                'interval_minutes' => 25,
            ]);

        $this->assertDatabaseHas('settings', [
            'key' => 'monitor_interval_minutes',
            'value' => '25',
        ]);
    }

    public function test_light_monitor_interval_can_be_read_and_updated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/settings/monitor-interval-light')
            ->assertOk()
            ->assertJson([
                'interval_minutes' => (int) config('app.monitor_interval_light_minutes'),
            ]);

        $this->postJson('/api/settings/monitor-interval-light', ['interval_minutes' => 7])
            ->assertOk()
            ->assertJson([
                'interval_minutes' => 7,
            ]);

        $this->assertDatabaseHas('settings', [
            'key' => 'monitor_interval_light_minutes',
            'value' => '7',
        ]);
    }

    public function test_log_retention_can_be_read_and_updated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/settings/log-retention')
            ->assertOk()
            ->assertJson([
                'retention_days' => 15,
            ]);

        $this->postJson('/api/settings/log-retention', ['retention_days' => 45])
            ->assertOk()
            ->assertJson([
                'retention_days' => 45,
            ]);

        $this->assertDatabaseHas('settings', [
            'key' => 'log_retention_days',
            'value' => '45',
        ]);
    }

    public function test_interval_settings_validation_rules_are_enforced(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/settings/monitor-interval', ['interval_minutes' => 0])
            ->assertStatus(422)
            ->assertJsonValidationErrors('interval_minutes');

        $this->postJson('/api/settings/monitor-interval-light', ['interval_minutes' => 10081])
            ->assertStatus(422)
            ->assertJsonValidationErrors('interval_minutes');
    }

    public function test_log_retention_validation_rules_are_enforced(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/settings/log-retention', ['retention_days' => 0])
            ->assertStatus(422)
            ->assertJsonValidationErrors('retention_days');

        $this->postJson('/api/settings/log-retention', ['retention_days' => 366])
            ->assertStatus(422)
            ->assertJsonValidationErrors('retention_days');
    }

    public function test_alert_email_can_be_read_and_updated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/settings/alert-email')
            ->assertOk()
            ->assertJson([
                'recipient_email' => 'gondocs.robert@gmail.com',
            ]);

        $this->postJson('/api/settings/alert-email', ['recipient_email' => 'alerts@example.com'])
            ->assertOk()
            ->assertJson([
                'recipient_email' => 'alerts@example.com',
            ]);

        $this->assertDatabaseHas('settings', [
            'key' => 'alert_email_recipient',
            'value' => 'alerts@example.com',
        ]);
    }

    public function test_alert_email_validation_rules_are_enforced(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/settings/alert-email', ['recipient_email' => 'invalid-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('recipient_email');
    }

    public function test_test_alert_email_endpoint_sends_email(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Mail::fake();

        $this->postJson('/api/settings/alert-email/test', ['recipient_email' => 'alerts@example.com'])
            ->assertOk()
            ->assertJson([
                'recipient_email' => 'alerts@example.com',
            ]);

        Mail::assertSent(OutageTestMail::class, function (OutageTestMail $mail) {
            return $mail->hasTo('alerts@example.com');
        });
    }
}
