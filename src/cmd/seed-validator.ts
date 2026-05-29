import { logger } from "@/utils/logger";

interface ValidationCheck {
  name: string;
  passed: boolean;
  errors: string[];
}

export class SeedValidator {
  private checks: ValidationCheck[] = [];

  private seenIds = new Set<string>();
  private seenEmails = new Set<string>();
  private seenBoxDisplayIds = new Set<string>();

  checkDuplicateId(id: string, entity: string, label: string): void {
    if (this.seenIds.has(id)) {
      this.addError("Duplicate IDs", `Duplicate ID "${id}" used by ${entity} "${label}"`);
    }
    this.seenIds.add(id);
  }

  checkDuplicateEmail(email: string, entity: string, label: string): void {
    const key = email.toLowerCase();
    if (this.seenEmails.has(key)) {
      this.addError("Duplicate Emails", `Duplicate email "${email}" used by ${entity} "${label}"`);
    }
    this.seenEmails.add(key);
  }

  checkDuplicateBoxDisplayId(displayId: string, label: string): void {
    if (this.seenBoxDisplayIds.has(displayId)) {
      this.addError("Duplicate Box Display IDs", `Duplicate box_display_id "${displayId}" for "${label}"`);
    }
    this.seenBoxDisplayIds.add(displayId);
  }

  checkRequiredFields(record: Record<string, unknown>, entity: string, label: string, requiredFields: string[]): void {
    for (const field of requiredFields) {
      const val = record[field];
      if (val === undefined || val === null || val === "") {
        this.addError("Required Fields", `${entity} "${label}" has missing/empty required field "${field}"`);
      }
    }
  }

  checkForeignKey(
    fkValue: string | null | undefined,
    fkName: string,
    validIds: Set<string>,
    entity: string,
    label: string,
  ): void {
    if (fkValue && !validIds.has(fkValue)) {
      this.addError(
        "Foreign Key Integrity",
        `${entity} "${label}" references ${fkName} = "${fkValue}" which does not exist among seeded IDs`,
      );
    }
  }

  checkEnum(value: string | null | undefined, validValues: readonly string[], entity: string, label: string, field: string): void {
    if (value && !validValues.includes(value)) {
      this.addError("Invalid Enum", `${entity} "${label}" has invalid ${field} value "${value}"`);
    }
  }

  private addError(checkName: string, error: string): void {
    let check = this.checks.find((c) => c.name === checkName);
    if (!check) {
      check = { name: checkName, passed: true, errors: [] };
      this.checks.push(check);
    }
    check.passed = false;
    check.errors.push(error);
  }

  finalize(): boolean {
    logger.info("--- Seed Validation Results ---");
    let allPassed = true;
    for (const check of this.checks) {
      if (check.passed) {
        logger.info(`  ✔ ${check.name}`);
      } else {
        allPassed = false;
        logger.error(`  ✘ ${check.name}`);
        for (const err of check.errors) {
          logger.error(`    - ${err}`);
        }
      }
    }
    if (allPassed) {
      logger.info("All seed validation checks passed.");
    } else {
      logger.error("Seed validation FAILED. Aborting seed execution.");
      process.exit(1);
    }
    return allPassed;
  }
}
