namespace RentalManagement.Api.Tests;

/// <summary>
/// Groups every test class that talks to the shared PostgreSQL container.
/// Two reasons for one collection rather than one fixture per class: the container
/// is started once instead of once per class, and xUnit runs a collection's classes
/// sequentially — required here because each class truncates the same tables.
/// </summary>
[CollectionDefinition(Name)]
public class PostgresCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "postgres";
}
