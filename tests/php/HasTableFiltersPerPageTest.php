<?php

namespace OmniTend\LaravelDashboard\Tests;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use OmniTend\LaravelDashboard\Traits\HasTableFilters;

/**
 * A confirmed cross-package drift found in the whole-repo review: the Vue
 * `DXTable` offers a default `perPageOptions` of [10, 20, 50, 100], but this PHP
 * helper hard-coded an allowed list of [10, 25, 50, 100] and silently reset
 * anything else to 10. So a consumer using BOTH halves of the library (the whole
 * point of the package) who selected 20 rows/page got a visible reset to 10, and
 * 25 (PHP-legal) was never offered by the table. The allowed list is now aligned
 * with the Vue default AND configurable via `$allowedPerPage`, so a consumer that
 * customises `perPageOptions` can keep the two ends in agreement.
 *
 * Also the first PHP test in the repo — stands up Testbench so the PHP surface
 * (until now entirely untested) has a harness to grow.
 */
class HasTableFiltersPerPageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('per_page_test_items', function ($table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        foreach (range(1, 60) as $index) {
            PerPageTestItem::create(['name' => "Item {$index}"]);
        }
    }

    /** Build a JSON (API-path) request carrying the given perPage. */
    private function jsonRequestWithPerPage(int $perPage): Request
    {
        $request = Request::create('/items', 'GET', ['perPage' => $perPage]);
        $request->headers->set('Accept', 'application/json');

        return $request;
    }

    private function perPageFor(Request $request, ?array $allowedPerPage = null): int
    {
        $controller = new FakeTableController();
        if ($allowedPerPage !== null) {
            $controller->allowedPerPage = $allowedPerPage;
        }

        $response = $controller->run(PerPageTestItem::query(), $request);

        return $response->getData(true)['pagination']['per_page'];
    }

    public function test_it_honours_the_vue_default_option_of_20(): void
    {
        // The whole bug: 20 is offered by the Vue table's default perPageOptions
        // but the old allowed list [10, 25, 50, 100] rejected it and reset to 10.
        $this->assertSame(20, $this->perPageFor($this->jsonRequestWithPerPage(20)));
    }

    public function test_it_still_honours_the_other_shared_options(): void
    {
        $this->assertSame(10, $this->perPageFor($this->jsonRequestWithPerPage(10)));
        $this->assertSame(50, $this->perPageFor($this->jsonRequestWithPerPage(50)));
        $this->assertSame(100, $this->perPageFor($this->jsonRequestWithPerPage(100)));
    }

    public function test_it_rejects_an_out_of_range_size_and_falls_back_to_10(): void
    {
        // Still guards against arbitrary client-supplied page sizes.
        $this->assertSame(10, $this->perPageFor($this->jsonRequestWithPerPage(999)));
    }

    public function test_the_allowed_list_is_configurable_per_controller(): void
    {
        // Values chosen to distinguish "override honoured" from "default list
        // happens to agree": 33 is NOT in the default list (so the old ignored-
        // override behaviour would reset it to 10), and 50 IS in the default list
        // but NOT the custom one (so the override must actively exclude it).
        $this->assertSame(
            33,
            $this->perPageFor($this->jsonRequestWithPerPage(33), [10, 33, 66]),
        );
        $this->assertSame(
            10,
            $this->perPageFor($this->jsonRequestWithPerPage(50), [10, 33, 66]),
        );
    }
}

/**
 * Minimal Eloquent model backing the in-memory table.
 */
class PerPageTestItem extends Model
{
    protected $table = 'per_page_test_items';

    protected $guarded = [];
}

/**
 * Exposes the protected trait method for testing. `$allowedPerPage` mirrors the
 * optional controller property the trait now reads.
 */
class FakeTableController
{
    use HasTableFilters;

    public ?array $allowedPerPage = null;

    public function run(Builder $query, Request $request)
    {
        return $this->tableResponse($query, $request, PerPageTestItem::class, 'Test/Index', 'items');
    }
}
