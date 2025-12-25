-- Create database if not exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ImportDB')
BEGIN
    CREATE DATABASE ImportDB;
END
GO

USE ImportDB;
GO

-- Example table for testing imports
-- Adjust columns based on your Excel structure
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SampleData]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SampleData] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Name] NVARCHAR(255) NOT NULL,
        [Email] NVARCHAR(255),
        [Phone] NVARCHAR(50),
        [Address] NVARCHAR(500),
        [City] NVARCHAR(100),
        [State] NVARCHAR(100),
        [ZipCode] NVARCHAR(20),
        [Country] NVARCHAR(100),
        [DateOfBirth] DATE,
        [Salary] DECIMAL(18, 2),
        [Department] NVARCHAR(100),
        [IsActive] BIT DEFAULT 1,
        [CreatedAt] DATETIME2 DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 DEFAULT GETDATE()
    );

    -- Create indexes for better performance
    CREATE NONCLUSTERED INDEX IX_SampleData_Email ON [dbo].[SampleData]([Email]);
    CREATE NONCLUSTERED INDEX IX_SampleData_Department ON [dbo].[SampleData]([Department]);
    CREATE NONCLUSTERED INDEX IX_SampleData_CreatedAt ON [dbo].[SampleData]([CreatedAt]);
END
GO

-- Example table for employee imports
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Employees] (
        [EmployeeId] INT IDENTITY(1,1) PRIMARY KEY,
        [FirstName] NVARCHAR(100) NOT NULL,
        [LastName] NVARCHAR(100) NOT NULL,
        [Email] NVARCHAR(255) UNIQUE NOT NULL,
        [PhoneNumber] NVARCHAR(50),
        [HireDate] DATE,
        [JobTitle] NVARCHAR(100),
        [Department] NVARCHAR(100),
        [Salary] DECIMAL(18, 2),
        [ManagerId] INT NULL,
        [CreatedAt] DATETIME2 DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Employees_Manager FOREIGN KEY (ManagerId) REFERENCES [dbo].[Employees](EmployeeId)
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_Employees_Email ON [dbo].[Employees]([Email]);
    CREATE NONCLUSTERED INDEX IX_Employees_Department ON [dbo].[Employees]([Department]);
    CREATE NONCLUSTERED INDEX IX_Employees_HireDate ON [dbo].[Employees]([HireDate]);
END
GO

-- Table for audit logging (optional)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ImportAuditLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ImportAuditLog] (
        [LogId] INT IDENTITY(1,1) PRIMARY KEY,
        [JobId] NVARCHAR(50) NOT NULL,
        [TableName] NVARCHAR(255) NOT NULL,
        [FileName] NVARCHAR(500),
        [TotalRecords] INT,
        [SuccessCount] INT,
        [FailedCount] INT,
        [StartTime] DATETIME2,
        [EndTime] DATETIME2,
        [Duration] INT, -- Duration in milliseconds
        [Status] NVARCHAR(50),
        [ErrorMessage] NVARCHAR(MAX),
        [CorrelationId] NVARCHAR(50),
        [CreatedAt] DATETIME2 DEFAULT GETDATE()
    );

    -- Create indexes
    CREATE NONCLUSTERED INDEX IX_ImportAuditLog_JobId ON [dbo].[ImportAuditLog]([JobId]);
    CREATE NONCLUSTERED INDEX IX_ImportAuditLog_CreatedAt ON [dbo].[ImportAuditLog]([CreatedAt]);
    CREATE NONCLUSTERED INDEX IX_ImportAuditLog_Status ON [dbo].[ImportAuditLog]([Status]);
END
GO

PRINT 'Database schema created successfully';