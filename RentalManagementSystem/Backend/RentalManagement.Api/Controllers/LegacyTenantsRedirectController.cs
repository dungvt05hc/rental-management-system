using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Compatibility shim for the pre-rename /api/tenants routes.
/// Redirects to /api/customers with 308 Permanent Redirect, which — unlike 301 —
/// obliges the client to replay the original method and body.
///
/// Scheduled for removal one release after the Tenant → Customer rename.
/// </summary>
[ApiController]
[AllowAnonymous]
public class LegacyTenantsRedirectController : ControllerBase
{
    /// <summary>
    /// Redirects /api/tenants to /api/customers
    /// </summary>
    [Route("api/tenants")]
    [AcceptVerbs("GET", "POST", "PUT", "PATCH", "DELETE")]
    public IActionResult RedirectCollection() => RedirectToCustomers(string.Empty);

    /// <summary>
    /// Redirects /api/tenants/{rest} to /api/customers/{rest}
    /// </summary>
    /// <param name="rest">The remainder of the original path</param>
    [Route("api/tenants/{*rest}")]
    [AcceptVerbs("GET", "POST", "PUT", "PATCH", "DELETE")]
    public IActionResult RedirectSubpath(string? rest) => RedirectToCustomers(rest ?? string.Empty);

    private IActionResult RedirectToCustomers(string rest)
    {
        var suffix = string.IsNullOrEmpty(rest) ? string.Empty : $"/{rest}";
        var target = $"/api/customers{suffix}{Request.QueryString}";

        // 308 keeps the method and body intact; 301/302 would rewrite POST to GET.
        Response.Headers.Append("Deprecation", "true");
        Response.Headers.Append("Link", "</api/customers>; rel=\"successor-version\"");

        return RedirectPermanentPreserveMethod(target);
    }
}
