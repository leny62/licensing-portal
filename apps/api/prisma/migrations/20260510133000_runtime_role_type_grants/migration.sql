GRANT USAGE ON TYPE "UserRole" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "ApplicationState" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "BankCategory" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "NotificationType" TO licensing_app, licensing_migrate;
GRANT USAGE ON TYPE "SystemLogLevel" TO licensing_app, licensing_migrate;

GRANT USAGE ON SCHEMA public TO licensing_app, licensing_migrate;
GRANT INSERT, SELECT ON TABLE system_logs TO licensing_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE system_logs FROM licensing_app;
GRANT ALL PRIVILEGES ON TABLE system_logs TO licensing_migrate;
