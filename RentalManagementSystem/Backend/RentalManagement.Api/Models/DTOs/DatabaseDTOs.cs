namespace RentalManagement.Api.Models.DTOs
{
    /// <summary>
    /// Database information DTO
    /// </summary>
    public class DatabaseInfo
    {
        public string DatabaseName { get; set; } = string.Empty;
        public string ServerName { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public long SizeInMB { get; set; }
        public bool IsOnline { get; set; }
        public DateTime CreatedDate { get; set; }
        public int TotalTables { get; set; }
        public List<TableInfo> Tables { get; set; } = new();
        public List<string> AppliedMigrations { get; set; } = new();
        public List<string> PendingMigrations { get; set; } = new();
    }

    /// <summary>
    /// Table information DTO
    /// </summary>
    public class TableInfo
    {
        public string TableName { get; set; } = string.Empty;
        public string Schema { get; set; } = string.Empty;
        public int RowCount { get; set; }
        public long SizeInKB { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public List<ColumnInfo> Columns { get; set; } = new();
    }

    /// <summary>
    /// Column information DTO
    /// </summary>
    public class ColumnInfo
    {
        public string ColumnName { get; set; } = string.Empty;
        public string DataType { get; set; } = string.Empty;
        public bool IsNullable { get; set; }
        public bool IsPrimaryKey { get; set; }
        public bool IsForeignKey { get; set; }
        public string? DefaultValue { get; set; }
        public int? MaxLength { get; set; }
    }
}
