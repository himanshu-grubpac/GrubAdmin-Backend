import { logger } from "@/utils/logger";

const ULID_REGEX = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i;

interface ValidationCheck {
  name: string;
  passed: boolean;
  errors: string[];
}

export class SeedValidator {
  private checks: ValidationCheck[] = [];

  constructor(private allSeedIds: Set<string>) {}

  validateUlid(value: unknown, entity: string, label: string, field: string): void {
    if (typeof value !== "string" || !ULID_REGEX.test(value)) {
      this.addError(
        "ULID Format",
        `${entity} "${label}" has invalid ${field} "${String(value)}" — must be 26-char Crockford base32 (ULID)`,
      );
    }
  }

  checkDuplicateId(id: string, entity: string, label: string): void {
    if (this.allSeedIds.has(id)) {
      this.addError("Duplicate IDs", `Duplicate ID "${id}" used by ${entity} "${label}"`);
    }
    this.allSeedIds.add(id);
  }

  checkDuplicateEmail(email: string, entity: string, label: string): void {
    const key = email.toLowerCase();
    for (const check of this.checks) {
      if (check.name === "Duplicate Emails") {
        for (const err of check.errors) {
          if (err.includes(key)) return;
        }
      }
    }
    for (const check of this.checks) {
      if (check.name === "Duplicate Emails") {
        check.errors.push(`Duplicate email "${email}" used by ${entity} "${label}"`);
        check.passed = false;
        return;
      }
    }
    this.addError("Duplicate Emails", `Duplicate email "${email}" used by ${entity} "${label}"`);
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
        logger.info(`  \u2714 ${check.name}`);
      } else {
        allPassed = false;
        logger.error(`  \u2718 ${check.name}`);
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
