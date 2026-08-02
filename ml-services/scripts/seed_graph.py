"""Seeds the Neo4j drug-interaction graph with a small, real, verifiable
set of Drug nodes and INTERACTS_WITH relationships. Every pair below was
independently confirmed via PubMed case reports/studies or an FDA safety
communication before being added — none are invented.

Idempotent: uses MERGE throughout, safe to re-run.

Run from ml-services/: python -m scripts.seed_graph
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.graph_db import get_driver

# (drug_a, drug_b, mechanism, evidence strength, PMID or source)
# evidence: "major" = well-established, clinically significant per multiple
#   sources; "moderate" = real and documented but smaller/more variable
#   effect size in the literature.
INTERACTIONS = [
    (
        "warfarin",
        "amoxicillin",
        "Antibiotic-associated disruption of vitamin K-producing gut flora "
        "potentiates warfarin's anticoagulant effect, raising INR.",
        "major",
        "PMID:26138877",
    ),
    (
        "warfarin",
        "ibuprofen",
        "NSAID platelet inhibition and GI mucosal irritation compound "
        "warfarin's bleeding risk.",
        "major",
        "PMID:32455439",
    ),
    (
        "warfarin",
        "aspirin",
        "Aspirin displaces warfarin from plasma protein binding and adds "
        "antiplatelet effect on top of anticoagulation, raising bleeding "
        "risk.",
        "major",
        "PMC12429624",
    ),
    (
        "warfarin",
        "fluconazole",
        "Fluconazole inhibits CYP2C9, the enzyme that clears the more "
        "potent S-warfarin enantiomer, sharply raising INR.",
        "major",
        "PMID:8247921",
    ),
    (
        "warfarin",
        "ciprofloxacin",
        "Ciprofloxacin inhibits CYP1A2/CYP3A4 warfarin metabolism; case "
        "series report increased prothrombin time and bleeding.",
        "moderate",
        "PMID:1492006",
    ),
    (
        "warfarin",
        "sulfamethoxazole-trimethoprim",
        "Sulfonamide component inhibits CYP2C9 warfarin metabolism and "
        "displaces warfarin from protein binding; considered high-risk.",
        "major",
        "PMID:7445308",
    ),
    (
        "warfarin",
        "omeprazole",
        "Weak CYP2C19/3A4 inhibition modestly raises R-warfarin levels; "
        "controlled studies show no clinically significant INR change, "
        "but isolated case reports of INR increase exist.",
        "weak",
        "case reports (see docs/features.md)",
    ),
    (
        "ibuprofen",
        "aspirin",
        "Ibuprofen competitively blocks aspirin's binding site on platelet "
        "COX-1, attenuating aspirin's cardioprotective antiplatelet "
        "effect when dosed too close together.",
        "major",
        "FDA advisory, Sept 2006 (fda.gov/media/76636/download)",
    ),
    (
        "metformin",
        "ciprofloxacin",
        "Fluoroquinolones can cause dysglycemia (hyper- or hypoglycemia) "
        "in patients on antidiabetic agents.",
        "moderate",
        "FDA safety alert, July 2018",
    ),
]

DRUGS = sorted({d for pair in INTERACTIONS for d in (pair[0], pair[1])})


def seed() -> None:
    driver = get_driver()
    with driver.session() as session:
        session.run("CREATE CONSTRAINT drug_name_unique IF NOT EXISTS FOR (d:Drug) REQUIRE d.name IS UNIQUE")

        for name in DRUGS:
            session.run("MERGE (:Drug {name: $name})", name=name)

        for drug_a, drug_b, mechanism, evidence, source in INTERACTIONS:
            session.run(
                """
                MATCH (a:Drug {name: $drug_a})
                MATCH (b:Drug {name: $drug_b})
                MERGE (a)-[r:INTERACTS_WITH]->(b)
                SET r.mechanism = $mechanism, r.evidence = $evidence, r.source = $source
                """,
                drug_a=drug_a,
                drug_b=drug_b,
                mechanism=mechanism,
                evidence=evidence,
                source=source,
            )


def report() -> None:
    driver = get_driver()
    with driver.session() as session:
        node_count = session.run("MATCH (d:Drug) RETURN count(d) AS c").single()["c"]
        rel_count = session.run("MATCH ()-[r:INTERACTS_WITH]->() RETURN count(r) AS c").single()["c"]
        pairs = session.run(
            """
            MATCH (a:Drug)-[r:INTERACTS_WITH]->(b:Drug)
            RETURN a.name AS drug_a, b.name AS drug_b, r.evidence AS evidence
            ORDER BY drug_a, drug_b
            """
        )
        print(f"Drug nodes: {node_count}")
        print(f"INTERACTS_WITH relationships: {rel_count}")
        print("\nPairs:")
        for record in pairs:
            print(f"  {record['drug_a']} <-> {record['drug_b']}  [{record['evidence']}]")


if __name__ == "__main__":
    seed()
    report()
    get_driver().close()
